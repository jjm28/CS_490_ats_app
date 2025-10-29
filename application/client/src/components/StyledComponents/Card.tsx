import React from "react";
import "../../styles/StyledComponents/Card.css";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return <div className={`card ${className || ""}`}>{children}</div>;
};

export default Card;
