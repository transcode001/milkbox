import { type JSX, ReactNode } from "react";

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps): JSX.Element {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
  );
}
