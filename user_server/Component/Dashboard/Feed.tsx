export type Video = {
  id: string;
  title: string;
  creator: string;
  thumbnail?: string;
  url: string;
  domain?: string;
};

export function VideoCard({ video }: { video: Video }) {
  const hasThumb = !!video.thumbnail?.trim();

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group block
        rounded-md overflow-hidden
        transition-colors duration-100 ease-out
        hover:bg-neutral-800/25
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-1 focus-visible:ring-offset-neutral-950
      "
      aria-label={`Play ${video.title} by ${video.creator}`}
    >
      <div className="aspect-video w-full bg-neutral-900/80">
        {hasThumb ? (
          <img
            src={video.thumbnail}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-800/70 to-red-900/70 flex items-center justify-center">
            <span className="text-5xl font-black text-white/60 tracking-tighter">
              {video.creator.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="px-3 py-2 space-y-0.5">
        <h3 className="line-clamp-2 text-base sm:text-lg font-semibold leading-tight text-neutral-900">
          {video.title}
        </h3>

        <p className="text-xs text-neutral-500/75 truncate">
          {video.creator}
          {video.domain && ` · ${video.domain}`}
        </p>
      </div>
    </a>
  );
}

type DashboardContentProps = {
  videos: Video[];
};

export function DashboardContent({ videos }: DashboardContentProps) {
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        No videos yet. Enjoy the silence.
      </div>
    );
  }

  const grouped = videos.reduce(
    (acc, video) => {
      if (!acc[video.creator]) acc[video.creator] = [];
      acc[video.creator].push(video);
      return acc;
    },
    {} as Record<string, Video[]>,
  );

  const creators = Object.entries(grouped);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pt-12">
      {creators.map(([creator, items], index) => (
        <section key={creator} className={index === 0 ? "pt-0" : ""}>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">{creator}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {items.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
