// server/validators/templates.js
import { z } from "zod";

/* enums */
const templateKeyZ = z.enum(["chronological", "functional", "hybrid"]);

/* colors/fonts/layout (loose) */
const hex = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

export const colorZ = z
  .object({
    primary: hex.optional(),
    text: hex.optional(),
    link: hex.optional(),
  })
  .partial();

export const fontZ = z
  .object({
    family: z.string().min(1).max(50).optional(),
    sizeScale: z.enum(["S", "M", "L"]).optional(),
    lineHeight: z.number().min(1).max(3).optional(),
  })
  .partial();

export const layoutZ = z
  .object({
    columns: z.union([z.literal(1), z.literal(2)]).optional(),
    sections: z.array(z.string()).max(50).optional(),
  })
  .partial();

export const styleZ = z
  .object({
    color: colorZ.optional(),
    font: fontZ.optional(),
    layout: layoutZ.optional(),
  })
  .partial();

/* templates */
export const createTemplateZ = z
  .object({
    // accept both new and old names
    title: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(100).optional(),

    // accept templateKey or type
    templateKey: templateKeyZ.optional(),
    type: templateKeyZ.optional(),

    style: styleZ.optional(),

    // optional metadata
    origin: z.enum(["system", "user"]).optional(),
    isShared: z.boolean().optional(),
    sharedWith: z.array(z.string()).optional(),
  })
  .refine((v) => Boolean(v.title || v.name), { message: "title or name required" })
  .refine((v) => Boolean(v.templateKey || v.type), { message: "templateKey or type required" });

export const updateTemplateZ = createTemplateZ.partial();

/* resumes */
export const createResumeZ = z
  .object({
    // accept filename or name
    filename: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(120).optional(),

    // allow either id or key
    templateId: z.string().optional().nullable(),
    templateKey: templateKeyZ.optional(),

    // data payloads
    resumedata: z.any().optional().default({}),
    content: z.any().optional(),

    // misc
    lastSaved: z.string().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    archived: z.boolean().optional(),
    groupId: z.string().nullable().optional(),
    version: z.number().int().positive().optional(),
  })
  .refine((v) => Boolean(v.filename || v.name), { message: "filename or name required" });

export const updateResumeZ = z.object({
  filename: z.string().min(1).max(120).optional(),
  name: z.string().min(1).max(120).optional(),
  templateId: z.string().optional(),
  templateKey: templateKeyZ.optional(),
  resumedata: z.any().optional(),
  content: z.any().optional(),
  lastSaved: z.string().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  archived: z.boolean().optional(),
  groupId: z.string().nullable().optional(),
  version: z.number().int().positive().optional(),
});

/* tiny validator middleware */
export const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "ValidationError", details: parsed.error.flatten() });
  }
  req.body = parsed.data;
  next();
};
