const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
  nav.classList.toggle('is-open', !open);
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('is-open');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.setAttribute('aria-label', 'Abrir menu');
}));
document.querySelector('#year').textContent = new Date().getFullYear();

// Initialize CircularGallery (React Bits)
document.addEventListener('DOMContentLoaded', () => {
  const galleryRoot = document.getElementById('circular-gallery-container');
  if (galleryRoot && typeof createCircularGallery === 'function') {
    createCircularGallery(galleryRoot, {
      items: [
        {
          image: 'assets/galeria/galeria-1.jpg',
          text: 'Recepção Acolhedora',
          description: 'Ambiente calmo e aconchegante para que seu pet se sinta seguro e confortável desde a chegada.'
        },
        {
          image: 'assets/galeria/galeria-2.jpg',
          text: 'Consultório Clínico',
          description: 'Atendimento calmo e humanizado com foco em prevenção, diagnóstico cuidadoso e orientação.'
        },
        {
          image: 'assets/galeria/galeria-4.jpg',
          text: 'Atenção & Carinho',
          description: 'Cada vida importa: cuidado dedicado e respeito em cada fase do seu animal companheiro.'
        },
        {
          image: 'assets/galeria/galeria-5.jpg',
          text: 'Dra. Jéssica',
          description: 'Dedicação médica veterinária próxima, ética e apaixonada por cuidar de vidas.'
        },
        {
          image: 'assets/galeria/galeria-7.jpg',
          text: 'Cães, Gatos & Silvestres',
          description: 'Acompanhamento preventivo para manter os laços de amor saudáveis por muitos anos.'
        },
        {
          image: 'assets/galeria/galeria-8.jpg',
          text: 'Especialidades & Cirurgia',
          description: 'Cardiologia, oftalmologia, dermatologia e procedimentos cirúrgicos com monitoramento.'
        }
      ],
      bend: 2.2,
      textColor: '#24233a',
      placeholderColor: '#f1eaf5',
      borderRadius: 0.05,
      font: '800 20px Manrope, sans-serif',
      scrollSpeed: 2,
      scrollEase: 0.05,
      itemSize: 0.88,
      itemAspect: 0.8,
      gap: 0.28,
      wave: 0.6,
      fadeEdges: 0.12,
      shadow: 0.16,
      autoScroll: 0.35,
      openOnClick: true
    });
  }
});
