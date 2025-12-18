import csrf from "csurf";

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: "lax", // ✅ CHANGE THIS
    secure: false,  // dev only
  },
});

export default csrfProtection;
