"""Exercise deployment and rollback without contacting production."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[2]


class DeployTest(unittest.TestCase):
    def test_build_errors_are_fatal_when_helpers_are_sourced(self):
        result = subprocess.run(
            ['bash', '-c', 'source "$1"; error expected; printf unsafe',
             'bash', str(PROJECT / 'bin/helpers/utils.sh')], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('unsafe', result.stdout)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='monoproxy-deploy-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        (self.repo / 'bin').mkdir(parents=True)
        shutil.copy2(PROJECT / 'bin/deploy', self.repo / 'bin/deploy')
        self.remote = self.root / 'server'
        self.remote.mkdir()
        (self.remote / '.env.production').write_text('SERVER_SECRET=keep-on-server\n')
        (self.remote / 'public').mkdir()
        (self.remote / 'public/old.html').write_text('old')
        (self.remote / 'compose.web-guide.yml').write_text('legacy')
        (self.remote / 'Caddyfile.production').write_text('legacy')
        self.releases = self.root / 'releases'
        commands = self.root / 'commands'
        commands.mkdir()
        stub = commands / 'stub'
        stub.write_text('''#!/usr/bin/env python3
import json, os, pathlib, shutil, subprocess, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ['COMMAND_LOG'], 'a') as log:
    log.write(json.dumps([name, args])+'\\n')
if name == 'ssh':
    if os.environ.get('TRUNCATE_REMOTE') == '1' and len(args[1].split()) > 5:
        sys.stdin.read()
        sys.exit(0)
    sys.exit(subprocess.call(['bash','-c',args[1]]))
if name == 'scp':
    target = args[1].split(':',1)[1]
    shutil.copyfile(args[0], target)
    if os.environ.get('CORRUPT_UPLOAD') == '1': pathlib.Path(target).write_text('broken')
if name in ('docker','caddy'):
    # An inherited SSH script stream would be consumed by an interactive child.
    sys.stdin.read()
    if name == 'docker' and 'up' in args and os.environ.get('FAIL_RUNTIME') == '1': sys.exit(42)
    if name == 'caddy' and args[0] in os.environ.get('FAIL_CADDY','').split(','): sys.exit(42)
''')
        stub.chmod(0o755)
        for name in ('ssh','scp','docker','caddy'):
            (commands / name).symlink_to(stub)
        builder = self.repo / 'bin/build-release'
        builder.write_text('''#!/bin/bash
set -euo pipefail
[[ "${FAIL_BUILD:-0}" == 0 ]] || exit 42
release=tmp/deploy-build/release
mkdir -p "$release/public/enrichreader.com" "$release/src/enrichreader.com/lib/web-guide"
printf ready > "$release/public/enrichreader.com/index.html"
printf runtime > "$release/src/enrichreader.com/lib/web-guide/server.mjs"
printf config > "$release/Caddyfile.production"
printf compose > "$release/compose.web-guide.yml"
mkdir -p "$release/bin"
printf '#!/bin/bash\nexit "${FAIL_INDEXNOW:-0}"\n' > "$release/bin/web-guide-node"
chmod +x "$release/bin/web-guide-node"
''')
        builder.chmod(0o755)
        self.log = self.root / 'calls.jsonl'
        self.shared = self.root / 'shared'
        # HOME is isolated so the developer's own ~/.bashrc exports never reach the fixture server.
        self.env = dict(os.environ, PATH=f"{commands}:{os.environ['PATH']}", HOME=str(self.root),
                        REMOTE_HOST='fixture', REMOTE_USER='fixture',
                        REMOTE_DIR=str(self.remote), RELEASES_DIR=str(self.releases),
                        SHARED_DIR=str(self.shared), COMMAND_LOG=str(self.log))
        self.env.pop('INDEXNOW_KEY',None)

    def deploy(self,*args,success=True,umask=None,**env):
        result = subprocess.run([str(self.repo/'bin/deploy'),*args],env=dict(self.env,**env),
                                capture_output=True,text=True,umask=-1 if umask is None else umask)
        if success:
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        else:
            self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def test_build_only_does_not_connect(self):
        self.assertEqual(self.deploy('--build-only'),[])
        self.assertFalse(self.remote.is_symlink())

    def test_failed_build_does_not_activate(self):
        self.deploy(success=False,FAIL_BUILD='1')
        self.assertTrue((self.remote/'public/old.html').exists())

    def test_success_reloads_caddy_and_starts_runtime_once(self):
        calls=self.deploy()
        self.assertTrue(self.remote.is_symlink())
        self.assertEqual((self.remote/'public/enrichreader.com/index.html').read_text(),'ready')
        self.assertEqual((self.remote/'.env.production').read_text(),'SERVER_SECRET=keep-on-server\n')
        self.assertTrue((self.remote.resolve()/'.env.production').is_symlink())
        self.assertEqual((self.shared/'.env.production').stat().st_mode & 0o777,0o600)
        self.assertEqual(self.remote.resolve().stat().st_mode & 0o777,0o755)
        self.assertEqual(sum(name=='docker' and 'up' in args for name,args in calls),1)
        self.assertTrue(any(name=='caddy' and args[0]=='reload' for name,args in calls))
        self.assertFalse(any(name=='caddy' and args[0] in ('stop','start','trust') for name,args in calls))
        self.assertFalse((self.repo/'.env.production').exists())

    def test_corrupt_upload_keeps_current_release(self):
        self.deploy(success=False,CORRUPT_UPLOAD='1')
        self.assertFalse(self.remote.is_symlink())
        self.assertTrue((self.remote/'public/old.html').exists())

    def test_invalid_caddy_keeps_current_release(self):
        self.deploy(success=False,FAIL_CADDY='validate')
        self.assertFalse(self.remote.is_symlink())

    def test_runtime_failure_restores_previous_release(self):
        self.deploy(success=False,FAIL_RUNTIME='1')
        self.assertTrue((self.remote/'public/old.html').exists())

    def test_reload_failure_restores_previous_release(self):
        self.deploy(success=False,FAIL_CADDY='reload,start')
        self.assertTrue((self.remote/'public/old.html').exists())
        self.assertEqual(list(self.releases.glob('monoproxy-20*')),[])

    def test_stopped_caddy_is_started(self):
        calls=self.deploy(FAIL_CADDY='reload')
        self.assertTrue(self.remote.is_symlink())
        self.assertTrue(any(name=='caddy' and args[0]=='start' for name,args in calls))

    def test_failed_first_deploy_leaves_no_link_and_next_deploy_works(self):
        shutil.rmtree(self.remote)
        self.deploy(success=False,FAIL_RUNTIME='1')
        self.assertFalse(os.path.lexists(self.remote))
        self.deploy()
        self.assertEqual((self.remote/'public/enrichreader.com/index.html').read_text(),'ready')

    def test_stale_staging_directory_cannot_take_over_activation(self):
        self.deploy()
        stale=Path(f'{self.remote}.next')
        stale.mkdir()
        (stale/'STALE').write_text('old staging')
        self.deploy()
        self.assertTrue(self.remote.is_symlink())
        self.assertFalse((self.remote/'STALE').exists())
        self.assertFalse(os.path.lexists(stale))

    def test_server_exports_cannot_override_deploy_arguments(self):
        (self.remote/'.env.production').write_text(f'STAGE=/nowhere\nRELEASES_DIR={self.root}/elsewhere\nCHECKSUM=0\n')
        (self.root/'.bashrc').write_text('export STAGE=production\n')
        self.deploy()
        self.assertTrue(self.remote.resolve().is_relative_to(self.releases))

    def test_indexnow_failure_does_not_fail_live_release(self):
        self.deploy(INDEXNOW_KEY='key',FAIL_INDEXNOW='1')
        self.assertTrue(self.remote.is_symlink())

    def test_release_mode_ignores_local_umask(self):
        self.deploy(umask=0o077)
        self.assertEqual(self.remote.resolve().stat().st_mode & 0o777,0o755)

    def test_truncated_ssh_script_cannot_report_success(self):
        self.deploy(success=False,TRUNCATE_REMOTE='1')
        self.assertFalse(self.remote.is_symlink())

    def test_retains_five_releases(self):
        self.releases.mkdir()
        for index in range(8):
            (self.releases/f'monoproxy-2025010100000{index}-fixture').mkdir()
        self.deploy()
        self.assertEqual(len(list(self.releases.glob('monoproxy-20*'))),5)
        self.assertTrue(self.remote.resolve().exists())


if __name__=='__main__':
    unittest.main()
