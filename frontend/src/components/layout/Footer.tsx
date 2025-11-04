const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-6 mt-6 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center">
          <div className="text-center">
            <p className="text-sm">
              &copy; {currentYear} Rajiv Wallace🇩🇲. All rights reserved.
            </p>
            <p className="text-xs mt-1">
              <a
                href="https://rajivwallace.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Portfolio Website
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
