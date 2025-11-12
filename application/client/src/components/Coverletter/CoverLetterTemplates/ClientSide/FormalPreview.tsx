import React from "react";
import type { PreviewProps } from "../../Coverletterstore";

export default function FormalPreview({ data, onEdit, className }: PreviewProps) {
  return (
    <div>
  <div  id="doc-html"

    className="w-[1000px] mx-auto p-24 bg-white shadow text-[20px] leading-[1.65] text-gray-900"
  >
    {/* HEADER (centered only) */}
    <div
      className="group cursor-pointer text-center mb-20 relative"
      onClick={() => onEdit("header")}
    >
      <h1 className="text-[29px]! font-semibold tracking-[0.2px]">
        {data.name}
      </h1>
      <p className="text-[15px] text-gray-600 mt-1">
        {data.address +" · " + data.phonenumber+ " · "+ data.email}
      </p>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 -top-6 text-[10px] uppercase tracking-wide text-gray-400">
        Edit header
      </span>
    </div>

    {/* BODY (everything from here is LEFT-ALIGNED) */}
    <div className="text-left">
      {/* Date */}
      <p
        className="group cursor-pointer mb-10 relative"
        onClick={() => onEdit("date")}
      >
        {data.date}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-20 top-0 text-[10px] uppercase tracking-wide text-gray-400">
          Edit date
        </span>
      </p>

      {/* Recipient block */}
      <div
        className="group cursor-pointer mb-10 relative"
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
        className="group cursor-pointer mb-8 relative"
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
          <p key={i} className={i < data.paragraphs.length - 1 ? "mb-6" : ""}>
            {p}
          </p>
        ))}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-14 top-0 text-[10px] uppercase tracking-wide text-gray-400">
          Edit body
        </span>
      </div>

      {/* Closing */}
      <p
        className="group cursor-pointer mt-6 mb-8 relative"
        onClick={() => onEdit("closing")}
      >
        {data.closing}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-24 top-0 text-[10px] uppercase tracking-wide text-gray-400">
          Edit closing
        </span>
      </p>

      {/* Signature note */}
      <p
        className="group cursor-pointer italic mb-10 relative"
        onClick={() => onEdit("signature")}
      >
        {data.signatureNote}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-32 top-0 text-[10px] uppercase tracking-wide text-gray-400">
          Edit signature
        </span>
      </p>

      {/* Name */}
      <p>{data.name}</p>
    </div>
  </div>
</div>
  );
}
