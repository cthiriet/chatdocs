import { EmptyChat } from "@/components/EmptyChat";
import { Header } from "@/components/Header";
import { Spinner } from "@/components/Spinner";
import { PaperAirplaneIcon } from "@heroicons/react/20/solid";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

function Interaction({ query, answer }) {
  return (
    <li className="py-6 border-t border-gray-200">
      <p className="font-semibold font-opensans text-gray-900 text-base mb-3">
        {query}
      </p>
      <p className="text-gray-600 font-medium font-opensans text-base leading-7">
        {answer}
      </p>
    </li>
  );
}

function Queries() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm();

  const [responses, setResponses] = useState([]);

  const [response, setResponse] = useState("");

  const chatWindowRef = useRef(null);

  const queryInput = watch("query");

  useEffect(() => {
    const storedResponses = localStorage.getItem("responses");
    if (storedResponses) setResponses(JSON.parse(storedResponses));
  }, []);

  useEffect(() => {
    if (chatWindowRef.current) {
      // Scroll to the bottom of the chat window when the component updates
      chatWindowRef.current.scrollTop = chatWindowRef.current?.scrollHeight;
    }
  }, [responses, response]);

  const ask = async ({ query }) => {
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          namespace: process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      // This data is a ReadableStream
      const data = res.body;
      if (!data) {
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;

      let resDoc = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setResponse((prev) => prev + chunkValue);
        resDoc += chunkValue;
      }

      setResponse((prev) => prev.trim());
      resDoc = resDoc.trim();

      const newResponses = [
        {
          id: uuidv4(),
          query,
          answer: resDoc,
        },
        ...responses,
      ];

      setResponses(newResponses);

      localStorage.setItem("responses", JSON.stringify(newResponses));

      setResponse("");

      reset();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col overflow-y-auto px-8 flex-1">
      {!responses.length && !response ? (
        <EmptyChat />
      ) : (
        <ul
          role="list"
          ref={chatWindowRef}
          className="pb-8 min-h-0 flex-1 overflow-y-auto flex flex-col-reverse max-w-4xl w-full mx-auto"
        >
          {response && <Interaction query={queryInput} answer={response} />}

          {responses.map((query) => (
            <Interaction
              key={query.id}
              query={query.query}
              answer={query.answer}
            />
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit(ask)} className="pb-12">
        <div className="flex rounded-xl shadow-sm max-w-3xl mx-auto">
          <div className="relative flex flex-grow items-stretch focus-within:z-10">
            <input
              type="text"
              required
              className="block w-full rounded-none rounded-l-xl border-gray-300 focus:border-sky-500 focus:ring-sky-500 py-3 px-4"
              placeholder="Ask anything..."
              {...register("query")}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="relative -ml-px inline-flex items-center space-x-2 rounded-r-xl border border-gray-300 bg-gray-50 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Spinner />
            ) : (
              <PaperAirplaneIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <Queries />
    </>
  );
}
