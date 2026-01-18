"use client";

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { formatDate } from "@repo/core";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Card>
          <h1>Milkbox Desktop</h1>
          <p>Running on Electron</p>
          <p className={styles.date}>Built: {formatDate(new Date())}</p>
          <Button>Click me</Button>
        </Card>
      </div>
    </main>
  );
}
