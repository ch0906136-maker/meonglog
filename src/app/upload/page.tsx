import UploadForm from "@/components/UploadForm";
import MyDogCharacter from "@/components/MyDogCharacter";
import DogName from "@/components/DogName";

export const metadata = { title: "영상 업로드 - 멍로그" };

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-5 sm:py-12">
      <div className="animate-fade-up flex flex-col items-center text-center">
        <MyDogCharacter className="animate-float h-28 w-28" label="영상을 기다리는 강아지" />
        <h1 className="mt-4 break-keep text-2xl font-bold sm:text-3xl">🎥 <DogName />의 영상을 올려주세요</h1>
        <p className="mt-3 text-muted">
          영상을 올리면 AI가 강아지의 행동을 살펴보고 영상 속 멍로그를 만들어요.
        </p>
      </div>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  );
}
