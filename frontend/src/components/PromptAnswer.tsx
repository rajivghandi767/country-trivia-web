import React from "react";

function PromptAnswer() {
  return (
    <div className="text-center p-5">
      <h1>
        What is the {} of {}
      </h1>
      <input
        className="border-2 border-black rounded m-1 p-1"
        type="text"
        placeholder="Type your answer here..."
      />
      <div>
        <button className="border-2 border-black rounded p-1">Submit</button>
      </div>
    </div>
  );
}

export default PromptAnswer;
