import Link from 'next/link';

const Header = () => {
    
    const menuItems = [
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'About Us', href: '/about' },
    ];

    return (
        <header className="shadow-md bg-white">
            {/* Container: centers content and sets max width */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* 1. Left: Logo (Positioned Right in the prompt's description, but often visually on the left) */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="text-2xl font-bold text-indigo-600">
                            YourLogo
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
                        <Link
                            href="/create"
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out shadow-lg"
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