// 강아지 사진을 원본 비율 그대로(object-contain) 보여주는 프레임.
// 남는 자리는 같은 사진을 흐리게 깔아서, 잘리지 않으면서도 빈 띠 없이 자연스럽게 보여요.
export default function PetPhoto({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string; // 크기/모양(rounded 등)은 여기서 정해요
}) {
  return (
    <div className={`relative overflow-hidden bg-beige ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="relative h-full w-full object-contain" />
    </div>
  );
}
