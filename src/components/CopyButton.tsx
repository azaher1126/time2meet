"use client";

import { useState } from "react";

interface CopyButtonProps {
  children: React.ReactElement;
  copiedChildren: React.ReactElement;
  text: string;
  className: string;
}

export function CopyButton({
  children,
  copiedChildren,
  text,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={copyText} className={className}>
      {copied ? copiedChildren : children}
    </button>
  );
}

export function CopyLinkButton({
  children,
  copiedChildren,
  text,
  className,
}: CopyButtonProps) {
  let linkText = text;
  if (typeof window !== "undefined") {
    linkText = window.location.origin + text;
  }

  return (
    <CopyButton
      text={linkText}
      className={className}
      copiedChildren={copiedChildren}
    >
      {children}
    </CopyButton>
  );
}
