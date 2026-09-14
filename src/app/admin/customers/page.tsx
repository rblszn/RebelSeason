import { getAllCustomers, getCustomersCount } from "@/lib/dal/users";
import { Pagination } from "@/components/ui/Pagination";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers | Admin",
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10);
  const search = resolvedParams.search;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    getAllCustomers({ skip, limit, search }),
    getCustomersCount({ search })
  ]);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customers</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone || "No phone"}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {format(new Date(customer.createdAt), "MMM d, yyyy")}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">
                      {customer._count.orders}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">
                      {customer._count.reviews}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              No customers found.
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination totalPages={totalPages} currentPage={page} />
          </div>
        )}
      </div>
    </div>
  );
}
