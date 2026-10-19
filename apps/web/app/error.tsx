'use client';
export default function ErrorPage({reset}:{reset:()=>void}) {
  return <main><h1>Something interrupted this view.</h1><p>Please try opening it again.</p><button onClick={reset}>Try again</button></main>;
}
