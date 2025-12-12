// components/Jobs/CommuterPlannerMap.tsx
import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Overlay from "ol/Overlay";
import { fromLonLat } from "ol/proj";
import {
  Style,
  Circle as CircleStyle,
  Fill,
  Stroke,
  Text as TextStyle,
} from "ol/style";
import "ol/ol.css";
import type {
  CommuterPlannerHome,
  CommuterPlannerJob,
} from "../../../api/jobs";

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

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<Overlay | null>(null);

  // Initialize map + overlay once
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
          source: new OSM(),
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

    // Tooltip overlay
    if (tooltipRef.current) {
      const overlay = new Overlay({
        element: tooltipRef.current,
        offset: [0, -16],
        positioning: "bottom-center",
        stopEvent: false,
      });
      map.addOverlay(overlay);
      overlayRef.current = overlay;
    }

    // Click to focus / toggle focus
    map.on("singleclick", (evt) => {
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const kind = feature.get("kind");
        if (kind === "job") {
          const id = feature.get("id");
          if (id) onJobFocus(id as string);
        }
      });
    });

    // Hover tooltip
    map.on("pointermove", (evt) => {
      const overlay = overlayRef.current;
      const tooltipEl = tooltipRef.current;
      if (!overlay || !tooltipEl) return;

      const pixel = evt.pixel;
      const feature = map.forEachFeatureAtPixel(pixel, (f) => f) as
        | Feature
        | undefined;

      if (!feature) {
        tooltipEl.style.display = "none";
        return;
      }

      const kind = feature.get("kind");
      if (kind !== "home" && kind !== "job") {
        tooltipEl.style.display = "none";
        return;
      }

      let html = "";

      if (kind === "home") {
        const homeData = (map.get("homeData") as CommuterPlannerHome | null) || null;
        html =
          "<div><strong>Home</strong>" +
          (homeData?.location
            ? `<div>${homeData.location}</div>`
            : "") +
          "</div>";
      } else if (kind === "job") {
        const id = feature.get("id") as string;
        const jobsData =
          ((map.get("jobsData") as CommuterPlannerJob[]) || []) ?? [];
        const job = jobsData.find((j) => j.id === id);
        if (!job) {
          tooltipEl.style.display = "none";
          return;
        }

        const locText =
          job.location?.city ||
          job.location?.normalized ||
          job.location?.raw ||
          "";
        const commuteText = job.commute
          ? `${job.commute.distanceKm.toFixed(1)} km • ${
              job.commute.durationMinutes
            } min`
          : "";

        html = `<div>
          <strong>${job.title}</strong>
          <div>${job.company}</div>
          ${
            locText
              ? `<div style="color:#9ca3af;">${locText}</div>`
              : ""
          }
          ${
            commuteText
              ? `<div style="margin-top:2px;">${commuteText}</div>`
              : ""
          }
        </div>`;
      }

      tooltipEl.innerHTML = html;
      tooltipEl.style.display = "block";
      overlay.setPosition(evt.coordinate);
    });

    mapInstanceRef.current = map;
  }, [onJobFocus]);

  // Update features when home/jobs/focus change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const vectorSource = vectorSourceRef.current;
    if (!map || !vectorSource) return;

    vectorSource.clear();

    // Store latest home/jobs for tooltip access
    map.set("homeData", home);
    map.set("jobsData", jobs);

    const features: Feature[] = [];

    const homeGeo =
      home?.geo && home.geo.lat && home.geo.lng ? home.geo : null;
    const focusedJob =
      focusedJobId && jobs.find((j) => j.id === focusedJobId && j.geo)
        ? (jobs.find((j) => j.id === focusedJobId) as CommuterPlannerJob)
        : null;

    // 1) Route line + label if home + focused job
    if (homeGeo && focusedJob?.geo) {
      const homeLonlat: [number, number] = [homeGeo.lng, homeGeo.lat];
      const jobLonlat: [number, number] = [
        focusedJob.geo.lng,
        focusedJob.geo.lat,
      ];

      const routeGeom = new LineString([
        fromLonLat(homeLonlat),
        fromLonLat(jobLonlat),
      ]);

      const routeFeature = new Feature({
        geometry: routeGeom,
        kind: "route",
      });

      routeFeature.setStyle(
        new Style({
          stroke: new Stroke({
            color: "rgba(59,130,246,0.8)",
            width: 3,
            lineDash: [8, 6],
          }),
        })
      );

      features.push(routeFeature);

      if (focusedJob.commute) {
        const midLon = (homeLonlat[0] + jobLonlat[0]) / 2;
        const midLat = (homeLonlat[1] + jobLonlat[1]) / 2;
        const midPoint = new Point(fromLonLat([midLon, midLat]));

        const text = `${focusedJob.commute.distanceKm.toFixed(
          1
        )} km • ${focusedJob.commute.durationMinutes} min`;

        const labelFeature = new Feature({
          geometry: midPoint,
          kind: "route-label",
        });

        labelFeature.setStyle(
          new Style({
            text: new TextStyle({
              text,
              font: "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fill: new Fill({ color: "#1f2933" }),
              stroke: new Stroke({ color: "white", width: 3 }),
              backgroundFill: new Fill({ color: "rgba(255,255,255,0.8)" }),
              padding: [4, 6, 4, 6],
            }),
          })
        );

        features.push(labelFeature);
      }
    }

    // 2) Home feature
    if (homeGeo) {
      const homeFeature = new Feature({
        geometry: new Point(fromLonLat([homeGeo.lng, homeGeo.lat])),
        kind: "home",
      });
      homeFeature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 9,
            fill: new Fill({ color: "rgba(37,99,235,0.9)" }),
            stroke: new Stroke({ color: "white", width: 2 }),
          }),
          text: new TextStyle({
            text: "🏠",
            font: "14px system-ui",
            offsetY: -15,
          }),
        })
      );
      features.push(homeFeature);
    }

    // 3) Job features
    for (const job of jobs) {
      if (!job.geo || job.geo.lat == null || job.geo.lng == null) continue;

      const isFocused = job.id === focusedJobId;

      const feature = new Feature({
        geometry: new Point(fromLonLat([job.geo.lng, job.geo.lat])),
        kind: "job",
        id: job.id,
      });

      const baseColor = isFocused
        ? "rgba(220,38,38,0.9)" // selected = red
        : "rgba(16,185,129,0.9)"; // normal = teal

      const emoji = isFocused ? "⭐" : "💼";

      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: isFocused ? 8 : 6,
            fill: new Fill({ color: baseColor }),
            stroke: new Stroke({ color: "white", width: 1.5 }),
          }),
          text: new TextStyle({
            text: emoji,
            font: "13px system-ui",
            offsetY: -14,
          }),
        })
      );

      features.push(feature);
    }

    vectorSource.addFeatures(features);

    if (features.length > 0) {
      const extent = vectorSource.getExtent();
      map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 16 });
    }
  }, [home, jobs, focusedJobId]);

  return (
    <div className="w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-full rounded-xl overflow-hidden"
      />
      {/* Hover tooltip element controlled by OpenLayers Overlay */}
      <div
        ref={tooltipRef}
        className="pointer-events-none bg-gray-900 text-white text-[11px] px-2 py-1 rounded shadow-sm whitespace-nowrap"
        style={{ display: "none" }}
      />
    </div>
  );
}
