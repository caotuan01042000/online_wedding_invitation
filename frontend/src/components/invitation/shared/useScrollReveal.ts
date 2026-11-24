"use client";

import { useEffect, type RefObject } from "react";

/**
 * Hiện dần các khối khi lần đầu cuộn tới (chỉ chạy một lần cho mỗi khối).
 * - Chỉ ẩn những khối đang nằm dưới màn hình lúc mở trang, nên phần đầu thiệp không bị chớp.
 * - Nhiều khối cùng xuất hiện một lúc sẽ nối đuôi nhau 0.1s.
 * - Tắt hẳn khi khách bật "giảm chuyển động" hoặc trình duyệt cũ không có IntersectionObserver.
 * CSS đi kèm (.rv / .rv-in) nằm trong chuỗi CSS của từng template.
 */
export function useScrollReveal(root: RefObject<HTMLElement | null>, selector: string) {
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((e, i) => {
            const el = e.target as HTMLElement;
            el.style.transitionDelay = `${i * 0.1}s`;
            el.classList.add("rv-in");
            io.unobserve(el);
          });
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );

    const fold = window.innerHeight * 0.9;
    host.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.getBoundingClientRect().top < fold) return; // đã thấy ngay từ đầu: giữ nguyên
      el.classList.add("rv");
      io.observe(el);
    });

    return () => io.disconnect();
  }, [root, selector]);
}