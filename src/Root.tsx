import React from "react";
import { Composition } from "remotion";
import { Episode, type EpisodeProps } from "./Episode";
import { layout } from "./timeline";
import type { Episode as EpisodeData } from "./types";
// Written by scripts/prepare.py: every episode with its voiced lines and timings
import data from "./generated/episodes.json";

const FPS = 30;
const episodes = (data as unknown as { series: string; episodes: EpisodeData[] }).episodes;

export const Root: React.FC = () => (
  <>
    {episodes.map((ep) => (
      <Composition
        key={ep.id}
        id={ep.id}
        component={Episode}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={Math.max(1, layout(ep, FPS).total)}
        defaultProps={{ episode: ep, series: data.series } satisfies EpisodeProps}
      />
    ))}
  </>
);
