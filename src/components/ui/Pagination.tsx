"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage <= 1}
        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
      >
        <Link href={createPageUrl(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>

      {visiblePages.map((page, index) => {
        if (page === "...") {
          return (
            <span key={`dots-${index}`} className="px-3 py-2 text-sm text-muted-foreground">
              ...
            </span>
          );
        }
        
        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            asChild
          >
            <Link href={createPageUrl(page)}>
              {page}
            </Link>
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage >= totalPages}
        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
      >
        <Link href={createPageUrl(currentPage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
