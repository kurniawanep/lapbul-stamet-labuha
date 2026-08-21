import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/img/logo.jpg"
            alt="Stasiun Meteorologi Oesman Sadik"
            className={className}
            {...props}
        />
    );
}

