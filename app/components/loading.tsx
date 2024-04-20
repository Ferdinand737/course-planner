export default function LoadingSpinner(){
    return (
        <div className="flex justify-center items-center">
            <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0116 0 8 8 0 01-16 0zm8-7c-1.963 0-3.83.79-5.218 2.09a1 1 0 00-.25 1.196c.26.53.768.714 1.218.714.498 0 .835-.22 1.07-.47a5.977 5.977 0 014.36-1.97c1.38 0 2.67.47 3.68 1.25.34.27.79.22 1.09-.08s.31-.74.04-1.04A7.977 7.977 0 0012 4z"></path>
            </svg>
        </div>
    );
};