const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });
    return res.json({ exists: !!existingUser });
  } catch (error) {
    return res.status(500).json({ error: "Failed to check email" });
  }
};
