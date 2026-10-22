/*
 * Xeryo: small interface enhancements.
 * All page content is present in the HTML; this file only adds
 *  - a hairline under the sticky header once the page is scrolled
 *  - a gentle reveal for below-the-fold sections (skipped when the visitor
 *    prefers reduced motion or the browser lacks IntersectionObserver)
 */
(function () {
  'use strict';

  var header = document.querySelector('[data-site-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) {
    return;
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(items, function (item) {
      item.classList.add('is-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  Array.prototype.forEach.call(items, function (item) {
    observer.observe(item);
  });
})();
