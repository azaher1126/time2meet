"use client";

import { useState, KeyboardEvent, ClipboardEvent } from "react";
import z from "zod";

interface EmailListInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  currentUser: string;
  error?: string;
}

export function EmailListInput({
  value = [],
  onChange,
  currentUser,
  error,
}: EmailListInputProps) {
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState("");

  function removeEmail(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addEmail(email: string) {
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }

    const result = z.email().safeParse(trimmed);

    if (!result.success) {
      setLocalError("Invalid email address");
      return;
    }

    if (value.includes(trimmed)) {
      setLocalError("Email already added");
      return;
    }

    if (trimmed.toLowerCase() === currentUser.toLowerCase()) {
      setLocalError("You are already included");
      return;
    }

    onChange([...value, trimmed]);

    setInput("");
    setLocalError("");
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();

    const pastedText = e.clipboardData.getData("text");
    const emailList = pastedText
      .split(/[,;\s]+/) // Split by comma, semicolon, or whitespace
      .map((email) => email.trim());

    emailList.forEach((email) => addEmail(email));
  }

  return (
    <div>
      <div className="gap-1 min-h-10 bg-white rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-colors">
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300">
            {value.map((email, index) => (
              <span
                key={index}
                className="rounded-sm inline-flex items-center gap-1 py-1 px-2 bg-indigo-50"
              >
                <p>{email}</p>
                <button
                  type="button"
                  onClick={() => removeEmail(index)}
                  className="border-none bg-none cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => input && addEmail(input)}
          placeholder={
            value.length === 0
              ? "Enter email addresses..."
              : "Enter another email address..."
          }
          className="border-none outline-none w-full p-2 rounded-xl"
          style={{ outline: "none" }}
        />
      </div>
      {(localError || error) && (
        <p className="text-red-600 mt-2 text-sm">{localError || error}</p>
      )}
    </div>
  );
}
