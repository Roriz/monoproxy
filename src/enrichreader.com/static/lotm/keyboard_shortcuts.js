document.addEventListener('keydown', (event) => {
  // Ignore if user is inside an input field
  const tag = event.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  // Spacebar -> Toggle all players in registry
  if (event.code === 'Space') {
    event.preventDefault();
    if (window.playerRegistry && window.playerRegistry.length > 0) {
      const anyPlaying = window.playerRegistry.some(p => p.isPlaying);
      window.playerRegistry.forEach(p => {
        anyPlaying ? p.stop() : p.play();
      });
    }
  }

  // Left Arrow -> Scrub backward by 1 chapter
  if (event.code === 'ArrowLeft') {
    event.preventDefault();
    if (window.playerRegistry && window.playerRegistry.length > 0) {
      window.playerRegistry.forEach(p => {
        p.goTo(p.currentChapter - 1);
      });
    }
  }

  // Right Arrow -> Scrub forward by 1 chapter
  if (event.code === 'ArrowRight') {
    event.preventDefault();
    if (window.playerRegistry && window.playerRegistry.length > 0) {
      window.playerRegistry.forEach(p => {
        p.goTo(p.currentChapter + 1);
      });
    }
  }
});
