import type { ButtonHTMLAttributes } from "react";
type Props=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"ghost";};
export function Button({variant="primary",className="",...props}:Props){return <button className={`nv-button nv-button-${variant} ${className}`} {...props}/>;}
