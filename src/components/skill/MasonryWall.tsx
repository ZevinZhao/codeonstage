import { useLayoutEffect, useRef } from 'react';
import type { Skill } from '@/types';
import { GallerySkillCard } from './SkillCard';

export function MasonryWall({ skills, paused }: { skills: Skill[]; paused: boolean }) {
  const wallRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    let frame = 0;
    const items = Array.from(wall.children) as HTMLElement[];
    const arrange = () => {
      const columns = Number(getComputedStyle(wall).getPropertyValue('--wall-columns')) || 2;
      const gap = 8;
      const width = (wall.clientWidth - gap * (columns - 1)) / columns;
      const heights = Array<number>(columns).fill(0);
      for (const item of items) item.style.width = `${width}px`;
      for (const item of items) {
        const column = heights.indexOf(Math.min(...heights));
        item.style.transform = `translate3d(${column * (width + gap)}px, ${heights[column]}px, 0)`;
        heights[column] += item.offsetHeight + gap;
      }
      const height = Math.max(0, ...heights) - gap;
      wall.style.height = `${Math.max(0, height)}px`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(arrange);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(wall);
    items.forEach((item) => observer.observe(item));
    arrange();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [skills]);

  return (
    <div ref={wallRef} className="works-wall" aria-label="作品瀑布流">
      {skills.map((skill) => (
        <div key={skill.id} className="works-wall-item">
          <GallerySkillCard skill={skill} paused={paused} />
        </div>
      ))}
    </div>
  );
}
