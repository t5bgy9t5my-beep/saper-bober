export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      balance: 1000,
    });
  }

  return res.status(405).json({
    ok: false,
    error: "Method not allowed",
  });
}
