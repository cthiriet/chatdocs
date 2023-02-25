import { Header } from "@/components/Header";
import { LoadingPulse } from "@/components/LoadingPulse";
import { fetchPostJSON } from "@/lib/api-helpers";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

export default function Home() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  const [responses, setResponses] = useState([]);

  const ask = async ({ query }) => {
    try {
      const res = await fetchPostJSON(process.env.NEXT_PUBLIC_API_URL, {
        query: query,
      });
      setResponses([res, ...responses]);
      localStorage.setItem("responses", JSON.stringify([res, ...responses]));
      reset();
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    const localResponses = localStorage.getItem("responses");
    if (localResponses) {
      setResponses(JSON.parse(localResponses));
    }
  }, []);

  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 sm:mt-14 mb-8 w-full">
        <div className="mx-auto max-w-3xl mb-8">
          <div className="flex items-center justify-center pt-10">
            <img src="/logo.svg" alt="Logo" width={200} />
          </div>

          <p className="mx-auto font-display mt-3 max-w-2xl text-center tracking-tight text-slate-500">
            Get answers to your questions without browsing the documentation.
          </p>

          <form onSubmit={handleSubmit(ask)} className="mt-1 mb-5 pt-20">
            <div className="flex rounded-full shadow font-display font-medium">
              <div className="relative flex flex-grow items-stretch focus-within:z-10">
                <input
                  type="text"
                  required
                  className="block w-full rounded-none rounded-l-full py-3 px-4 border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  placeholder="Ask your question..."
                  {...register("query")}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="relative -ml-px inline-flex items-center space-x-2 rounded-r-full border border-gray-200 bg-gray-50 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              >
                <MagnifyingGlassIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </button>
            </div>
          </form>

          {isSubmitting && <LoadingPulse className="pt-5" />}

          <ul
            role="list"
            className="divide-y divide-gray-200 flex-1 pb-10 pt-5 mx-auto max-w-3xl"
          >
            {responses.map((query) => (
              <li key={query.id} className="py-5">
                <div className="mb-3 truncate text-ellipsis">
                  <p className="font-semibold text-gray-900 text-base">
                    {query.query}
                  </p>
                </div>
                <p className="text-gray-700 text-base">{query.answer}</p>
                {query.total_tokens && (
                  <p className="text-gray-400 text-xs mt-2">
                    {query.total_tokens} tokens processed
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
