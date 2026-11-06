"use client";

import { useMyDog } from "@/lib/my-dog";
import { useStyle } from "@/lib/my-style";
import DogCharacter, { type DogMood } from "./DogCharacter";

// 내 강아지 프로필(견종/털색)과 옷장에서 고른 옷이 반영된 캐릭터. 프로필이 비어 있으면 기본 캐릭터 그대로예요.
export default function MyDogCharacter({
  mood,
  className,
  label,
}: {
  mood?: DogMood;
  className?: string;
  label?: string;
}) {
  const { profile } = useMyDog();
  const { style } = useStyle();
  return (
    <DogCharacter
      mood={mood}
      className={className}
      label={label}
      look={{ breed: profile.breed, coat: profile.coat }}
      outfit={style.outfit}
    />
  );
}
