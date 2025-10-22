import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';


function Registration() {
  const [user, setUser] = useState(null);

    const handleSubmit = () => {
      console.log("Submited")
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
          Welcome to [AppName]
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form action="#" method="POST" className="space-y-6">
          <div >
            <label className="text-sm font-medium text-gray-900 flex"  >
              Email address
            </label>
            <div className="mt-2">
              <input  type="email"  name="email"  required  autoComplete="email"  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"/>
            </div>
          </div>

          <div>
              <label className="flex  text-sm font-medium text-gray-900" >    Password   </label>
            <div className="mt-2">
              <input type="password"  name="password"  required   autoComplete="current-password" className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"  />
            </div>
          </div>
          
          <div>
              <label className="flex  text-sm font-medium text-gray-900" >   Confirm Password   </label>
            <div className="mt-2">
              <input type="password"  name="confirm-password"  required   autoComplete="current-password" className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm"  />
            </div>
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
              Sign in
            </button>
          </div>
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



