(function () {
  const menuItems = [
    ['급여계산기', '/'],
    ['사용법', '/how-to-use'],
    ['급여가이드', '/wage-guide'],
    ['자주 묻는 질문', '/faq'],
    ['공지사항', '/notice'],
    ['사이트 소개', '/about'],
    ['문의하기', '/contact'],
  ];

  function setDrawerOpen(open) {
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    const button = document.getElementById('mobileMenuButton');
    if (!drawer || !overlay || !button) return;

    document.body.classList.toggle('mobile-drawer-open', open);
    drawer.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }

  function initMobileDrawer() {
    const headerInner = document.querySelector('.global-site-header .global-nav-inner');
    if (!headerInner || document.getElementById('mobileMenuButton')) return;

    const nav = headerInner.querySelector('.global-nav');
    if (nav) nav.classList.add('desktop-nav');

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'mobileMenuButton';
    button.className = 'mobile-menu-button';
    button.setAttribute('aria-label', '메뉴 열기');
    button.setAttribute('aria-controls', 'mobileDrawer');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
    headerInner.insertBefore(button, headerInner.firstChild);

    const overlay = document.createElement('div');
    overlay.id = 'mobileDrawerOverlay';
    overlay.className = 'mobile-drawer-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const drawer = document.createElement('aside');
    drawer.id = 'mobileDrawer';
    drawer.className = 'mobile-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="mobile-drawer-head">' +
        '<strong>알바BEE</strong>' +
        '<button type="button" class="mobile-drawer-close" aria-label="메뉴 닫기">×</button>' +
      '</div>' +
      '<nav class="mobile-drawer-nav" aria-label="모바일 메뉴">' +
        menuItems.map(function (item) {
          return '<a href="' + item[1] + '">' + item[0] + '</a>';
        }).join('') +
      '</nav>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    button.addEventListener('click', function () {
      setDrawerOpen(!document.body.classList.contains('mobile-drawer-open'));
    });
    overlay.addEventListener('click', function () { setDrawerOpen(false); });
    drawer.querySelector('.mobile-drawer-close').addEventListener('click', function () { setDrawerOpen(false); });
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setDrawerOpen(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setDrawerOpen(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileDrawer);
  } else {
    initMobileDrawer();
  }
})();
