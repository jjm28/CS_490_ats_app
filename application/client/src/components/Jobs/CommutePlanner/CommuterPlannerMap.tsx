// components/Jobs/CommuterPlannerMap.tsx
import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Style, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import "ol/ol.css";
import type {
  CommuterPlannerHome,
  CommuterPlannerJob,
} from "../../../api/jobs";
import { OSM } from "ol/source";

interface Props {
  home: CommuterPlannerHome | null;
  jobs: CommuterPlannerJob[];
  focusedJobId: string | null;
  onJobFocus: (id: string) => void;
}

export default function CommuterPlannerMap({
  home,
  jobs,
  focusedJobId,
  onJobFocus,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

const map = new Map({
  target: mapRef.current,
  layers: [
    new TileLayer({
      source: new OSM(), // instead of raw XYZ
    }),
    vectorLayer,
  ],
  view: new View({
    center: fromLonLat([-74, 40]),
    zoom: 3,
    minZoom: 2,
    maxZoom: 19,
  }),
});

    map.on("singleclick", (evt) => {
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const kind = feature.get("kind");
        if (kind === "job") {
          const id = feature.get("id");
          if (id) onJobFocus(id as string);
        }
      });
    });

    mapInstanceRef.current = map;
  }, [onJobFocus]);

  // Update features when home/jobs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    vectorSource.clear();

    const features: Feature[] = [];

    // Home feature
    if (home?.geo && home.geo.lat && home.geo.lng) {
      const homeFeature = new Feature({
        geometry: new Point(fromLonLat([home.geo.lng, home.geo.lat])),
        kind: "home",
      });
      homeFeature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: "rgba(37,99,235,0.8)" }), // blue-ish
            stroke: new Stroke({ color: "white", width: 2 }),
          }),
        })
      );
      features.push(homeFeature);
    }

    // Job features
    for (const job of jobs) {
      if (!job.geo || job.geo.lat == null || job.geo.lng == null) continue;
      const feature = new Feature({
        geometry: new Point(fromLonLat([job.geo.lng, job.geo.lat])),
        kind: "job",
        id: job.id,
      });

      const isFocused = job.id === focusedJobId;

      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: isFocused ? 8 : 6,
            fill: new Fill({
              color: isFocused
                ? "rgba(220,38,38,0.8)" // red for focused
                : "rgba(16,185,129,0.8)", // teal for others
            }),
            stroke: new Stroke({ color: "white", width: 1.5 }),
          }),
        })
      );

      features.push(feature);
    }

    vectorSource.addFeatures(features);

    // Fit view to features
    if (features.length > 0) {
      const extent = vectorSource.getExtent();
      map.getView().fit(extent, { padding: [40, 40, 40, 40] });
    }
  }, [home, jobs, focusedJobId]);

  return (
    <div className="w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-full rounded-xl overflow-hidden"
      />
    </div>
  );
}
