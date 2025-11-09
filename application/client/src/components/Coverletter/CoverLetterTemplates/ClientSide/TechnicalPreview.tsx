import React from "react";
import type { PreviewProps } from "../../Coverletterstore";

/* inline icons */
const IconPhone = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}>
    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l1.87-1.87a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V21a1 1 0 01-1 1C10.85 22 2 13.15 2 2a1 1 0 011-1h3.16a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.01l-1.87 1.87z" />
  </svg>
);
const IconMail = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}>
    <path d="M20 4H4a2 2 0 00-2 2v.4l10 6 10-6V6a2 2 0 00-2-2zm2 6.2l-10 6-10-6V18a2 2 0 002 2h16a2 2 0 002-2v-7.8z"/>
  </svg>
);
const IconPin = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}>
    <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 112.5-2.5A2.5 2.5 0 0112 11.5z"/>
  </svg>
);

export default function TechnicalPreview({ data, onEdit, className }: PreviewProps) {
  return (
    <div
      id="doc-html"
      className={[
        "w-full max-w-[800px] mx-auto bg-white shadow text-gray-900",
        "p-5 sm:p-8 md:p-16 xl:p-9",
        "text-[12px] sm:text-[13px] md:text-[14px] leading-relaxed md:leading-[1.65]",
        "rounded",
        className ?? "",
      ].join(" ")}
    >

      
      {/* header row */}
<div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4 md:gap-6 items-start border-l-[7px] border-gray-500 rounded-sm">
  {/* left block */}
  <div className="min-w-0 bg-[#EFF0F0]">
    <div className="pl-3 space-y-4">
      <div className="cursor-pointer" onClick={() => onEdit("header")}>
        <h1 className="text-left text-[30px] sm:text-[32px] font-extrabold tracking-wide text-[#2c4d73] mb-0">
          {data.name}
        </h1>
      </div>

      <div className="cursor-pointer text-left" onClick={() => onEdit("recipient")}>
        <div className="text-[10px] uppercase tracking-wide text-gray-500">To</div>
        <div className="text-[13px] font-semibold text-gray-800">
          {data.recipientLines?.[0] || "Company Details"}
        </div>
        {data.recipientLines?.slice(1).map((l, i) => (
          <div key={i} className="text-gray-600">{l}</div>
        ))}
        <div className="mt-3 text-gray-500 italic" onClick={() => onEdit("date")}>
          {data.date}
        </div>
      </div>
    </div>
  </div>

  {/* right block */}
  <div className="relative cursor-pointer" onClick={() => onEdit("header")}>
    <div className="rounded-2xl bg-[#12243b] text-white p-5 shadow-lg">
      {/* tighten vertical spacing to match reference */}
      <div className="space-y-15 text-[12px]">
        {data.email && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10">
              <IconMail />
            </span>
            <span className="break-all">{data.email}</span>
          </div>
        )}
        {data.phonenumber && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10">
              <IconPhone />
            </span>
            <span>{data.phonenumber}</span>
          </div>
        )}
        {data.address && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10">
              <IconPin />
            </span>
            <span className="break-words">{data.address}</span>
          </div>
        )}
      </div>
    </div>

    {/* teal connector: align to the gutter (left edge of card minus half the grid gap) */}
    <div className="absolute left-0 -translate-x-1/2 -ml-3 md:-ml-4 -bottom-3 w-3 h-3 bg-[#2fb4bf] rounded-full border-2 border-white" />
  </div>
</div>


      {/* BODY (LEFT-ALIGNED) */}
<div className="text-left mt-7 md:mt-9 relative border-l-[7px] border-[#2fb4bf] rounded-sm pl-4 md:pl-2">
        {/* long teal rail on the left of the body */}
        <div className="absolute -left-3 md:-left-4 top-0 bottom-0 w-[6px] rounded-full " />

        {/* greeting */}
        <p  className=" mb-4 text-gray-800 cursor-pointer" onClick={() => onEdit("greeting")}>
          {data.greeting}
        </p>

        {/* paragraphs (NOT centered) */}
        <div className="space-y-3 cursor-pointer" onClick={() => onEdit("paragraphs")}>
          {data.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>


      </div>
              {/* closing + short dark rail near signature */}
        <div className="text-left mt-7 md:mt-9 relative border-l-[7px] border-gray-500 rounded-sm pl-4 md:pl-2">
          <div className="absolute -left-3 md:-left-4 top-1 w-[6px] h-10 rounded-full" />
          <p className="mb-2 cursor-pointer" onClick={() => onEdit("closing")}>
            {data.closing}
          </p>
          <p className="italic text-gray-700 cursor-pointer" onClick={() => onEdit("signature")}>
            {data.signatureNote}
          </p>
          <p className="font-semibold mt-2">{data.name}</p>
        </div>
    </div>
  );
}
