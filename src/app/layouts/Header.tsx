import Link from 'next/link';
import Image from 'next/image';
import logoImage from '/public/images/logo/logo.gif';

const Header = () => {
        
    const primaryBgClass = "bg-fuchsia-600";
    const primaryBgHoverClass = "hover:bg-fuchsia-700";

    const menuItems = [
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'About Us', href: '/about' },
    ];

    return (
        <header className="shadow-md bg-white py-4">
            {/* Container: centers content and sets max width */}
            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* 1. Left: Logo (Positioned Right in the prompt's description, but often visually on the left) */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="text-2xl font-bold text-indigo-600">
                            <Image className='max-w-full h-auto' src={logoImage} alt='Logo' width={240} height={60} />
                        </Link>
                    </div>

                    {/* 2. Center: Menus */}
                    <nav className="hidden md:flex space-x-8">
                        {menuItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-gray-600 hover:text-indigo-600 transition duration-150 ease-in-out font-medium"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>

                    {/* 3. Right: Create Now Button */}
                    <div className="flex items-center">
                        <Link href="/login" className='px-10 py-3 me-3 border border-gray-300 rounded-full text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition duration-150 cursor-pointer shadow-sm'>
                            Login
                        </Link>
                        <Link
                            href="/create"
                            className={`px-10 py-3 border border-transparent rounded-full text-base font-semibold text-white ${primaryBgClass} ${primaryBgHoverClass} transition duration-150 cursor-pointer shadow-lg`}
                        >
                            Create Now
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;