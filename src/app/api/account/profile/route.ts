import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mergeShopCustomerInto, phoneForStorage } from "@/lib/pos/customer";

export const dynamic = "force-dynamic";


export async function PUT(request: Request) {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.userId as string },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone: phoneForStorage(phone) }) // allow nulling/clearing phone
      },
      // Never send the stored password hash back to the browser.
      select: { id: true, name: true, email: true, phone: true },
    });

    // If this number was already used for a shop purchase, bring that history across.
    if (phone) await mergeShopCustomerInto(updatedUser.id, updatedUser.phone);

    // We should also update session name if we want, but it requires saving the session again.
    // The session helper gets session, we can mutate and save it.
    if (name) {
      session.name = name;
      await session.save();
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
