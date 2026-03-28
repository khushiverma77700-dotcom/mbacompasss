import { Link } from "react-router-dom";
import { Tag, Percent } from "lucide-react";
import { motion } from "framer-motion";

const offers = [
  { label: "60% Off CAT Courses", discount: "60%", exam: "cat", color: "from-red-500 to-orange-500" },
  { label: "70% Off SNAP Courses", discount: "70%", exam: "xat-snap", color: "from-purple-500 to-pink-500" },
  { label: "50% Off GMAT Prep", discount: "50%", exam: "gmat", color: "from-blue-500 to-cyan-500" },
  { label: "40% Off GRE + TOEFL", discount: "40%", exam: "gre-toefl", color: "from-green-500 to-emerald-500" },
];

const OfferBanners = () => {
  return (
    <section className="py-6 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.exam}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/category/${offer.exam}?offer=true`}
                className={`block rounded-xl bg-gradient-to-br ${offer.color} p-4 text-white hover:shadow-lg hover:scale-105 transition-all duration-300`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="w-5 h-5" />
                  <span className="text-2xl font-bold font-heading">{offer.discount}</span>
                </div>
                <p className="text-sm font-medium opacity-90">{offer.label}</p>
                <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
                  <Tag className="w-3 h-3" /> Click to view
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OfferBanners;
