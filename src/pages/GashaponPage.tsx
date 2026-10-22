import { useMemo, useState } from 'react';
import { CategoryNav } from '@/components/skill/CategoryNav';
import { GallerySiteMenu } from '@/components/layout/GallerySiteMenu';
import { GashaponMachine } from '@/components/gashapon/GashaponMachine';
import { skills } from '@/data';
import type { PrimaryCategory } from '@/types';

export function GashaponPage() {
  const [category, setCategory] = useState<PrimaryCategory | 'all'>('all');
  const pool = useMemo(
    () => category === 'all' ? skills : skills.filter((skill) => skill.primaryCategory === category),
    [category]
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 bg-[#080808]/95 px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-1.5">
          <GallerySiteMenu />
          <CategoryNav
            activeCategory={category}
            onSelect={setCategory}
            variant="gallery"
            className="min-w-0 flex-1"
          />
          <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/55">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f1cb4b]" />
            库存 {pool.length}
          </div>
        </div>
      </header>

      <main className="relative min-h-[calc(100vh-40px)] overflow-hidden px-3 py-5 sm:px-5 lg:px-8 lg:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_38%_42%,rgba(255,255,255,0.075),transparent_31%),radial-gradient(circle_at_72%_30%,rgba(241,203,75,0.035),transparent_27%)]" />
        <GashaponMachine pool={pool} />
      </main>
    </div>
  );
}
