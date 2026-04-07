/* Premium UI/UX Animations (Antigravity Style) */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Cursor Glow
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  document.body.appendChild(glow);

  const moveGlow = (e) => {
    // We use a small timeout to make it drag smoothly
    requestAnimationFrame(() => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
  };
  document.addEventListener('mousemove', moveGlow, { passive: true });

  // 2. Magnetic Buttons
  document.querySelectorAll('.btn-primary, .btn-login').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px) scale(1.03)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0px, 0px) scale(1)';
    });
  });

  // 3. 3D Tilt Effect on Cards
  document.querySelectorAll('.kpi-card, .shift-card, .report-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      // Tilt formulas
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
});

// Overriding Page Transition to be globally extremely fluid
if (window.showPage) {
  const originalShowPage = window.showPage;
  window.showPage = function(name, el) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => {
      if(p.classList.contains('active')) {
        p.style.animation = 'pageOutFront 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        setTimeout(() => p.classList.remove('active'), 250);
      }
    });

    setTimeout(() => {
      const target = document.getElementById('page-' + name);
      if (target) {
        target.classList.add('active');
        target.style.animation = 'pageInScale 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
      }
    }, 200);
    
    // Evaluate logic for side effects (like rendering tables)
    originalShowPage(name, el);
    // Remove immediate active set by original to let our animation govern it smoothly
    pages.forEach(p => p.classList.remove('active'));
    setTimeout(() => {
      const target = document.getElementById('page-' + name);
      if(target) target.classList.add('active');
    }, 200);
  };
}
