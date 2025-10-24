import React, { useState, useEffect, useRef } from 'react';
import { isValidEmailBasic , splitEmail,isAllowedDomain, isValidPassword} from '../utils/helpers';
import { useNavigate  } from 'react-router-dom';
import { setAuth } from "../utils/auth";


function Registration() {


  const [user, setUser] = useState(null);
  const [email, setemail] = useState("")
  const [password, setpassword] = useState("")
  const [confirmpassword, setconfirmpassword] = useState("")
  const [err, setErr] = useState<string | null>(null);
  const [errEmail, setErrEmail] = useState<string | null>(null);
  const [errpassword, setErrpassword] = useState<string | null>(null);
  const [errconfirmpassword, setErrconfirmpassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [Success , setSuccess ] = useState<string | null>(null);

const navigate = useNavigate();

  useEffect(() => {
    if (Success) {
      const timer = setTimeout(() => {
        navigate("/Dashboard"); 
      }, 2000); 

      return () => clearTimeout(timer); 
    }
  }, [Success, navigate]);

  useEffect(() => {
  // CHANGED: after success, go to home ("/")
  if (Success) {
    const timer = setTimeout(() => {
      navigate("/"); // go to homepage
    }, 1200); // short delay to show the success text
    return () => clearTimeout(timer);
  }
}, [Success, navigate]);

  const validateEmail = (value: string): string | null => {
    if (!isValidEmailBasic(value)) return "Enter a valid email (e.g., name@example.com).";
    const { domain } = splitEmail(value);
    if (!isAllowedDomain(domain)) return "This email domain isn’t allowed.";
    return null;
  };
  const validatePassword = (value: string): string | null => {
    if (!isValidPassword(value)) {
      return "Password must be at least 8 characters, include 1 uppercase, 1 lowercase, and 1 number." ;
    } 
    return null;
  };

  const validateConfirm = (value: string):  string | null => {
    if ( password != value) {
      return "Passwords do not match.";
    }
    return null
  };

  const onBlurEmail = () => {
    setErrEmail(validateEmail(email))
  }
    const onBlurpassword = () => {
    setErrpassword(validatePassword(password))
  }
    const onBlurconfirmpassword= () => {
    setErrconfirmpassword(validateConfirm(confirmpassword))
  }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const msg = validateEmail(email)
      if (msg) return setErrEmail(msg);
       const msg1 = validatePassword(email)
      if (msg) return setErrEmail(msg);
       const msg2 = validateConfirm(email)
      if (msg) return setErrEmail(msg);
      setSubmitting(true);
      try {
      // Make post request ot backend server register account and verify if email already exist in database
      //
      console.log("Register with:", email);
      setErrEmail(null);
      setErrpassword(null);
      setErrconfirmpassword(null);
      setErr(null)
      setSuccess("Success! Your account has been created. Welcome aboard!")
    } catch (err) {
      setErr("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
return ( 
<div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <img
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
          alt="Your Company"
          className="mx-auto h-10 w-auto"
        />
        <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
          Welcome! Create your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action="#" method="POST" className="space-y-6">
          <div >
            <label className="text-sm font-medium text-gray-900 flex"  >
              Email address
            </label>
            <div className="mt-2">
              <input  type="email"  name="email"  placeholder='you@example.com' required onChange={(e) => setemail(e.target.value)} 
              onBlur={onBlurEmail}  
              className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm ${errEmail ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"}`}/>
            </div>
            {errEmail && <p className="mt-1 text-sm text-red-600">{errEmail}</p>}
          </div>

          <div>
              <label className="flex  text-sm font-medium text-gray-900" >    Password   </label>
            <div className="mt-2">
              <input type="password"  name="password"  required 
              onBlur={onBlurpassword} 
              onChange={(e) => setpassword(e.target.value)}  
              className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm ${errpassword ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"}`}  />
            </div>
                   {errpassword && <p className="mt-1 text-sm text-red-600">{errpassword}</p>}
          </div>
          
          <div>
              <label className="flex  text-sm font-medium text-gray-900" >   Confirm Password   </label>
            <div className="mt-2">
              <input type="password"  name="confirm-password"  required   
              onBlur={onBlurconfirmpassword} 
              onChange={(e) => setconfirmpassword(e.target.value)}
              autoComplete="current-password"
              className={`block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm ${errconfirmpassword ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"}`}   />
            </div>
             {errconfirmpassword && <p className="mt-1 text-sm text-red-600">{errconfirmpassword}</p>}
          </div>
          
          <div >
            <label className="text-sm font-medium text-gray-900 flex"  >  First Name         </label>
            <div className="mt-2">
              <input  type="text"  name="firstname"  required  autoComplete="firstname"  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"/>
            </div>
          </div>
          <div >
            <label className="text-sm font-medium text-gray-900 flex"  >     Last Name        </label>
            <div className="mt-2">
              <input  type="text"  name="lastname"  required  autoComplete="lastname"  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"/>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={handleSubmit}
            >
              {submitting ? "Checking..." : "Register"}
            </button>
          </div>
          {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
          {Success!=null ? <p className="mt-1 text-sm text-green-600">{Success}</p>  :  <span></span>}
        </form>
{/* 
        <p className="mt-10 text-center text-sm text-gray-500">
          Not a member?{" "}
          <a
            href="#"
            className="font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Start a 14 day free trial
          </a>
        </p> */}
      </div>

    </div>
);


}


export default Registration;



