"use client";

import { useMyDog } from "@/lib/my-dog";

// 내 강아지 이름 (이 기기에 저장된 이름, 없으면 기본 이름)
export default function DogName() {
  const { name } = useMyDog();
  return <>{name}</>;
}
