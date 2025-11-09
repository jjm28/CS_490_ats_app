import { z } from "zod";

export const styleZ = z.object({
  primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  font: z.string().min(1).max(50),
});

export const layoutZ = z.object({
  columns: z.union([z.literal(1), z.literal(2)]),
  sections: z.array(z.string()).min(1).max(20),
});

export const createTemplateZ = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["chronological", "functional", "hybrid", "custom"]),
  style: styleZ.optional(),
  layout: layoutZ.optional(),
  origin: z.enum(["system", "user", "import"]).optional(),
  isShared: z.boolean().optional(),
  sharedWith: z.array(z.string()).optional(),
});

export const updateTemplateZ = createTemplateZ.partial();

export const createResumeZ = z.object({
  name: z.string().min(1).max(120),
  templateId: z.string().optional().nullable(),
  content: z.any().optional().default({}), 
});

export const updateResumeZ = z.object({
  name: z.string().min(1).max(120).optional(),
  templateId: z.string().optional(),
  content: z.any().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string()).optional(),         
  groupId: z.string().nullable().optional(),      
  version: z.number().int().positive().optional()
});

// tiny helper (same signature you use elsewhere)
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
