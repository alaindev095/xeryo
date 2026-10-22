/*
 * Xeryo: accessible mobile navigation.
 *
 * Progressive enhancement: without JavaScript the navigation stays visible
 * and wraps beneath the wordmark (see responsive.css). With JavaScript it
 * becomes a toggleable panel on small screens.
 *
 * Behaviour:
 *  - the button exposes its state with aria-expanded
 *  - Escape closes the panel and returns focus to the button
 *  - Tab and Shift+Tab are kept inside the open panel
 *  - the panel closes when a link is chosen or the viewport becomes wide
 */
(function () {
  'use strict';

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) {
    return;
  }

  var label = toggle.querySelector('.nav-toggle-label');
  var root = document.documentElement;
  var wide = window.matchMedia('(min-width: 60em)');

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  function focusableItems() {
    return [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll('a[href]')));
  }

  function setOpen(open, restoreFocus) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
    root.classList.toggle('nav-open', open);
    if (label) {
      label.textContent = open ? 'Close' : 'Menu';
    }
    if (open) {
      var firstLink = nav.querySelector('a[href]');
      if (firstLink) {
        firstLink.focus();
      }
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  toggle.addEventListener('click', function () {
    setOpen(!isOpen(), true);
  });

  document.addEventListener('keydown', function (event) {
    if (!isOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, true);
      return;
    }

    if (event.key === 'Tab') {
      var items = focusableItems();
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  nav.addEventListener('click', function (event) {
    var target = event.target;
    if (target && target.closest && target.closest('a')) {
      setOpen(false, false);
    }
  });

  function onViewportChange() {
    if (wide.matches && isOpen()) {
      setOpen(false, false);
    }
  }

  if (wide.addEventListener) {
    wide.addEventListener('change', onViewportChange);
  } else if (wide.addListener) {
    wide.addListener(onViewportChange);
  }
})();
