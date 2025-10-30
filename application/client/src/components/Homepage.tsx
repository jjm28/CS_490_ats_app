import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">OnTrac</h1>
      <p className="text-gray-600 mb-6">
        Stay focused. Stay organized. Stay OnTrac.
      </p>
    </div>
  );
}

export default HomePage;
