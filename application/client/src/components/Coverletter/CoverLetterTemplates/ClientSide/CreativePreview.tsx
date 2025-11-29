import React from "react";
import type { PreviewProps } from "../../Coverletterstore";

// tiny inline icons (no external deps)
const IconPhone = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l1.87-1.87a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V21a1 1 0 01-1 1C10.85 22 2 13.15 2 2a1 1 0 011-1h3.16a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.01l-1.87 1.87z" />
  </svg>
);
const IconMail = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
    <path d="M20 4H4a2 2 0 00-2 2v.4l10 6 10-6V6a2 2 0 00-2-2zm2 6.2l-10 6-10-6V18a2 2 0 002 2h16a2 2 0 002-2v-7.8z"/>
  </svg>
);
const IconPin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
    <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 112.5-2.5A2.5 2.5 0 0112 11.5z"/>
  </svg>
);

export default function CreativePreview({ data, onEdit, className }: PreviewProps) {
  return (
    <div
      id="doc-html"
      className={[
        "w-full max-w-[794px] mx-auto bg-white shadow text-gray-900",
        "p-5 sm:p-8 md:p-16 xl:p-20",
        "text-[12px] sm:text-[13px] md:text-[14px] leading-relaxed md:leading-[1.65]",
        "rounded",
        className ?? "",
      ].join(" ")}
    >
      {/* Decorative header band + centered name */}
      <div
        className="relative mb-6 sm:mb-8 md:mb-10 group cursor-pointer"
        onClick={() => onEdit("header")}
      >

        {/* sage blocks left & right */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-20 w-28 sm:w-45 bg-[#D9E5DB] rounded" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-20 w-28 sm:w-45 bg-[#D9E5DB] rounded" />

        <h1 className="text-center text-2xl sm:text-[26px] md:text-[28px] font-extrabold tracking-wider uppercase relative">
          {data.name}
        </h1>

        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 -top-5 text-[10px] uppercase tracking-wide text-gray-400">
          Edit header
        </span>
      </div>

      {/* Contact row */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-gray-700 mb-10 sm:mb-12 md:mb-14 group cursor-pointer"
        onClick={() => onEdit("header")}
      >
        <span className="inline-flex items-center gap-2">
          <IconPhone /> {data.phonenumber}
        </span>
        <span className="inline-flex items-center gap-2">
          <IconMail /> {data.email}
        </span>
        <span className="inline-flex items-center gap-2">
          <IconPin /> {data.address}
        </span>
      </div>

      {/* Body (left aligned) */}
      <div className="text-left">
        {/* Date */}
        <p
          className="group cursor-pointer mb-8 sm:mb-10 relative text-gray-800"
          onClick={() => onEdit("date")}
        >
          {data.date}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-20 top-0 text-[10px] uppercase tracking-wide text-gray-400">
            Edit date
          </span>
        </p>

        {/* Recipient block (muted like placeholder) */}
        <div
          className="group cursor-pointer mb-8 sm:mb-10 relative text-gray-500"
          onClick={() => onEdit("recipient")}
        >
          {data.recipientLines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-28 top-0 text-[10px] uppercase tracking-wide text-gray-400">
            Edit recipient
          </span>
        </div>

        {/* Greeting */}
        <p
          className="group cursor-pointer mb-6 relative text-gray-800"
          onClick={() => onEdit("greeting")}
        >
          {data.greeting}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-28 top-0 text-[10px] uppercase tracking-wide text-gray-400">
            Edit greeting
          </span>
        </p>

        {/* Paragraphs */}
        <div
          className="group cursor-pointer relative"
          onClick={() => onEdit("paragraphs")}
        >
          {data.paragraphs.map((p, i) => (
            <p key={i} className={i < data.paragraphs.length - 1 ? "mb-5 sm:mb-6" : ""}>
              {p}
            </p>
          ))}

          
          {(data as any).bullets?.length ? (
            <ul className="list-disc pl-6 my-4 space-y-2">
              {(data as any).bullets.map((b: string, i: number) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}

          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-14 top-0 text-[10px] uppercase tracking-wide text-gray-400">
            Edit body
          </span>
        </div>

        {/* Closing */}
        <p
          className="group cursor-pointer mt-6 mb-6 relative"
          onClick={() => onEdit("closing")}
        >
          {data.closing}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-24 top-0 text-[10px] uppercase tracking-wide text-gray-400">
            Edit closing
          </span>
        </p>

        {/* Signature line */}
        <p
          className="group cursor-pointer italic mb-8 relative"
          onClick={() => onEdit("signature")}
        >
          {data.signatureNote}
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-32 top-0 text-[10px] uppercase tracking-wide text-gray-400">
            Edit signature
          </span>
        </p>

        {/* Name */}
        <p className="font-semibold">{data.name}</p>
      </div>
    </div>
  );
}
