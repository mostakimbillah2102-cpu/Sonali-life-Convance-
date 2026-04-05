const Footer = () => {
  return (
    <footer className="mt-12 py-8 text-center text-gray-500 text-sm border-t border-emerald-100">
      <p>© ২০২৪ সোনালী লাইফ ইন্স্যুরেন্স কোম্পানি লিমিটেড | সর্বস্বত্ব সংরক্ষিত</p>
      <div className="flex justify-center gap-4 mt-2">
        <a href="#" className="hover:text-emerald-600 transition-colors">আমাদের সম্পর্কে</a>
        <span>•</span>
        <a href="#" className="hover:text-emerald-600 transition-colors">সহায়তা</a>
        <span>•</span>
        <a href="#" className="hover:text-emerald-600 transition-colors">শর্তাবলী</a>
      </div>
    </footer>
  );
};

export default Footer;