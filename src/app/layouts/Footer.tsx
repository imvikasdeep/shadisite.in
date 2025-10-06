import Link from 'next/link';

const Footer = () => {
    
    const footerItems = [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Contact', href: '/contact' },
    ];

    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-800 mt-10">
            {/* Container: centers content and sets max width */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center py-6 text-sm">

                    {/* Left: Copyright Text */}
                    <div className="text-gray-400 mb-4 md:mb-0">
                        &copy; {currentYear} YourCompany, Inc. All rights reserved.
                    </div>

                    {/* Right: Menu */}
                    <div className="flex space-x-6">
                        {footerItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-gray-400 hover:text-white transition duration-150 ease-in-out"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;