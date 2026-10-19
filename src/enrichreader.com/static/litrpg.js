// A clearly labeled fictional illustration; this is separate from the reader app.
const demo = document.querySelector('.companion-demo');
if (demo) {
  const examples = {
    '12': { description: "The party hired Mara to guide them through the northern pass. She knows the old roads and carries a silver compass.", role: 'Mountain guide' },
    '24': { description: "Mara has mapped the party's route beyond the northern pass. The Wayfinders' Guild gave her the silver compass.", role: 'Party navigator' },
  };
  const controls = demo.querySelectorAll('[data-demo-chapter]');
  demo.querySelector('[data-demo-controls]').hidden = false;
  controls.forEach(button => {
    button.addEventListener('click', () => {
      const chapter = button.dataset.demoChapter;
      const example = examples[chapter];
      demo.querySelector('[data-demo-position]').textContent = `Chapter ${chapter}`;
      demo.querySelector('[data-demo-description]').textContent = example.description;
      demo.querySelector('[data-demo-role]').textContent = example.role;
      demo.querySelector('[data-demo-boundary]').textContent = `This profile shows details revealed by chapter ${chapter}.`;
      controls.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      demo.querySelector('[data-demo-live]').textContent = `Example at chapter ${chapter}. ${example.description}`;
    });
  });
}
