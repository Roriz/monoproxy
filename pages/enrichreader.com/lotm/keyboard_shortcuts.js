/**
 * Keyboard Shortcuts for Lord of the Mysteries Data Analysis.
 * Provides Space for Play/Pause and Arrow Keys for scrubbing.
 */

document.addEventListener('keydown', (e) => {
    // Avoid triggering shortcuts when typing in inputs (though there aren't many here)
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.target.tagName === 'TEXTAREA') return;

    const players = window.playerRegistry || [];
    if (players.length === 0) return;

    // Find the player currently in view (optional enhancement)
    // For now, we apply to the player of the section closest to the viewport center or just all of them if they are independent
    // The previous implementation was independent, but usually, users want to control the chart they are looking at.

    function getActivePlayer() {
        let bestPlayer = null;
        let minDistance = Infinity;
        const centerY = window.innerHeight / 2;

        players.forEach(p => {
            const rect = p.playBtn.getBoundingClientRect();
            const distance = Math.abs((rect.top + rect.height / 2) - centerY);
            if (distance < minDistance) {
                minDistance = distance;
                bestPlayer = p;
            }
        });
        return bestPlayer;
    }

    const activePlayer = getActivePlayer();
    if (!activePlayer) return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            activePlayer.isPlaying ? activePlayer.stop() : activePlayer.play();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            activePlayer.stop();
            activePlayer.goTo(activePlayer.currentChapter - 1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            activePlayer.stop();
            activePlayer.goTo(activePlayer.currentChapter + 1);
            break;
    }
});
