import type { CoverLetterData } from "./CoverLetterTemplates/Pdf/Formalpdf"; 

export type SectionKey =
  | "header"
  | "date"
  | "recipient"
  | "greeting"
  | "paragraphs"
  | "closing"
  | "signature";

export type PreviewProps = {
  data: CoverLetterData;
  onEdit: OnEdit;          
  className?: string;      
}
export type OnEdit = (section: SectionKey) => void;

export type Template = {
  key: "formal" | "creative" | "technical" | "academic" | "entry-level" | "executive" | "leadership";
  title: string;
  img: string;
  blurb?: string;
  Industries: string[];
  TemplateData: TemplateDataType;
};

export type TemplateDataType = {
    name: string;
    phonenumber: string;
    email: string;
    address:string;
    date: string;
    recipientLines: string[];
    greeting: string;
    paragraphs: string[];
    closing: string;
    signatureNote: string;
};
export  const TEMPLATES: Template[] = [
  {
    key: "formal",
    title: "Formal Template",
    img: "https://aicdn.picsart.com/a783657d-cd1d-4c18-aba0-ba19779f0058.png",
    blurb: "Classic business layout for corporate and government roles.",
    Industries: ["Finance", "Consulting", "Business", "Government"],
    TemplateData: {
    name: "Molly Smith",
    email: "msmith@email.com",
    address: "21 Spring Street, Anycity, NY 12000",
    phonenumber: "555-122-3333",
    date: "December 11, 2020",
    recipientLines: [
      "John Brown",
      "Sales Manager",
      "Acme Corp.",
      "123 Business Rd.",
      "Business City, NY 54321",
    ],
    greeting: "Dear Mr. Brown,",
    paragraphs: [
      "I wish to apply for the sales position advertised on Monster.com. Terry Johnson suggested that I contact you directly, as we have worked together, and he felt that I would be a good fit with your team.",
      "For the past two years I have been working in sales for Goodman & Co. I have consistently exceeded my targets and was recognized last quarter for outstanding service. As an avid cyclist and user of many of your products, I'm aware that Acme Corp. is a company with tremendous potential. I am confident that my experience, communication skills, and ability to convey product benefits effectively would enable me to excel in the sales role.",
      "I would be delighted to discuss with you how I might be an asset to the Acme Corp. sales team. Thank you for your consideration; I look forward to hearing from you.",
    ],
    closing: "Respectfully yours,",
    signatureNote: "Signature (hard copy letter)",
  }
  },
  {
    key: "creative",
    title: "Creative Template",
    img: "https://aicdn.picsart.com/b2d856a2-8da9-4747-afca-0cf8a6b232f6.png",
    blurb: "Bold headings and modern typography for design/marketing.",
    Industries: ["Marketing", "Design", "Startup", "Product Management"],
        TemplateData: {
    name: "Molly Smith",
    email: "msmith@email.com",
    address: "21 Spring Street, Anycity, NY 12000",
    phonenumber: "555-122-3333",
    date: "December 11, 2020",
    recipientLines: [
      "John Brown",
      "Sales Manager",
      "Acme Corp.",
      "123 Business Rd.",
      "Business City, NY 54321",
    ],
    greeting: "Dear Mr. Brown,",
    paragraphs: [
      "I wish to apply for the sales position advertised on Monster.com. Terry Johnson suggested that I contact you directly, as we have worked together, and he felt that I would be a good fit with your team.",
      "For the past two years I have been working in sales for Goodman & Co. I have consistently exceeded my targets and was recognized last quarter for outstanding service. As an avid cyclist and user of many of your products, I'm aware that Acme Corp. is a company with tremendous potential. I am confident that my experience, communication skills, and ability to convey product benefits effectively would enable me to excel in the sales role.",
      "I would be delighted to discuss with you how I might be an asset to the Acme Corp. sales team. Thank you for your consideration; I look forward to hearing from you.",
    ],
    closing: "Respectfully yours,",
    signatureNote: "Signature (hard copy letter)",
  }

  },
  {
    key: "technical",
    title: "Technical Template",
    img: "https://www.myperfectresume.com/wp-content/themes/myperfectresume/img/cl-templates/color-cat/defaults/bold-cover-letter-template.svg",
    blurb: "Minimalist, skills-first layout for SWE/Data/IT roles.",
    Industries: ["Technology", "Engineering", "IT"],
        TemplateData: {
    name: "Molly Smith",
    email: "msmith@email.com",
    address: "21 Spring Street, Anycity, NY 12000",
    phonenumber: "555-122-3333",
    date: "December 11, 2020",
    recipientLines: [
      "John Brown",
      "Sales Manager",
      "Acme Corp.",
      "123 Business Rd.",
      "Business City, NY 54321",
    ],
    greeting: "Dear Mr. Brown,",
    paragraphs: [
      "I wish to apply for the sales position advertised on Monster.com. Terry Johnson suggested that I contact you directly, as we have worked together, and he felt that I would be a good fit with your team.",
      "For the past two years I have been working in sales for Goodman & Co. I have consistently exceeded my targets and was recognized last quarter for outstanding service. As an avid cyclist and user of many of your products, I'm aware that Acme Corp. is a company with tremendous potential. I am confident that my experience, communication skills, and ability to convey product benefits effectively would enable me to excel in the sales role.",
      "I would be delighted to discuss with you how I might be an asset to the Acme Corp. sales team. Thank you for your consideration; I look forward to hearing from you.",
    ],
    closing: "Respectfully yours,",
    signatureNote: "Signature (hard copy letter)",
  }
  },
    {
    key: "entry-level",
    title: "Entry-Level / Student Template",
    img: "https://www.myperfectresume.com/wp-content/themes/myperfectresume/img/cl-templates/color-cat/defaults/bold-cover-letter-template.svg",
    blurb: "Simple, clean format for students and new grads.",
    Industries: ["Student", "Internship", "Entry Level"],
        TemplateData: {
    name: "Molly Smith",
    email: "msmith@email.com",
    address: "21 Spring Street, Anycity, NY 12000",
    phonenumber: "555-122-3333",
    date: "December 11, 2020",
    recipientLines: [
      "John Brown",
      "Sales Manager",
      "Acme Corp.",
      "123 Business Rd.",
      "Business City, NY 54321",
    ],
    greeting: "Dear Mr. Brown,",
    paragraphs: [
      "I wish to apply for the sales position advertised on Monster.com. Terry Johnson suggested that I contact you directly, as we have worked together, and he felt that I would be a good fit with your team.",
      "For the past two years I have been working in sales for Goodman & Co. I have consistently exceeded my targets and was recognized last quarter for outstanding service. As an avid cyclist and user of many of your products, I'm aware that Acme Corp. is a company with tremendous potential. I am confident that my experience, communication skills, and ability to convey product benefits effectively would enable me to excel in the sales role.",
      "I would be delighted to discuss with you how I might be an asset to the Acme Corp. sales team. Thank you for your consideration; I look forward to hearing from you.",
    ],
    closing: "Respectfully yours,",
    signatureNote: "Signature (hard copy letter)",
  }
  },
   {
    key: "executive",
    title: "Executive / Leadership Template",
    img: "https://www.myperfectresume.com/wp-content/themes/myperfectresume/img/cl-templates/color-cat/defaults/bold-cover-letter-template.svg",
    blurb: "Bold, strategic tone for senior and leadership roles",
    Industries: ["Management", "Operations", "Leadership"],
        TemplateData: {
    name: "Molly Smith",
    email: "msmith@email.com",
    address: "21 Spring Street, Anycity, NY 12000",
    phonenumber: "555-122-3333",
    date: "December 11, 2020",
    recipientLines: [
      "John Brown",
      "Sales Manager",
      "Acme Corp.",
      "123 Business Rd.",
      "Business City, NY 54321",
    ],
    greeting: "Dear Mr. Brown,",
    paragraphs: [
      "I wish to apply for the sales position advertised on Monster.com. Terry Johnson suggested that I contact you directly, as we have worked together, and he felt that I would be a good fit with your team.",
      "For the past two years I have been working in sales for Goodman & Co. I have consistently exceeded my targets and was recognized last quarter for outstanding service. As an avid cyclist and user of many of your products, I'm aware that Acme Corp. is a company with tremendous potential. I am confident that my experience, communication skills, and ability to convey product benefits effectively would enable me to excel in the sales role.",
      "I would be delighted to discuss with you how I might be an asset to the Acme Corp. sales team. Thank you for your consideration; I look forward to hearing from you.",
    ],
    closing: "Respectfully yours,",
    signatureNote: "Signature (hard copy letter)",
  }
  },
];
