import { neon } from "@neondatabase/serverless";
import { auth } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const allowedFiles = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4", "application/pdf"]);
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const validId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function json(data, status = 200) {
  return Response.json(data, { headers: privateHeaders, status });
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function sessionUser() {
  const { data } = await auth().getSession();
  return data?.user?.emailVerified ? data.user : null;
}

function databaseError(error) {
  console.error("Workspace request failed", error?.code ?? error?.name);
  return json({ error: "작업실을 불러오거나 저장하지 못했어요." }, 503);
}

export async function GET(request) {
  try {
    const user = await sessionUser();
    if (!user) return json({ error: "이메일 인증 후 로그인해 주세요." }, 401);
    const sql = neon(process.env.DATABASE_URL);
    const assetId = new URL(request.url).searchParams.get("asset");
    if (assetId !== null) {
      if (!validId.test(assetId)) return json({ error: "파일을 찾을 수 없어요." }, 404);
      const [asset] = await sql`
        SELECT encode(asset, 'base64') AS bytes, asset_type
        FROM public.skill_workspace_items
        WHERE owner_id = ${user.id} AND id = ${assetId} AND kind = 'draft'`;
      if (!asset) return json({ error: "파일을 찾을 수 없어요." }, 404);
      return new Response(Buffer.from(asset.bytes, "base64"), {
        headers: { ...privateHeaders, "Content-Type": asset.asset_type, "Content-Disposition": "attachment" },
      });
    }
    const items = await sql`
      SELECT id, kind, title, description, skill, prompt_text, asset_type, asset_name, created_at
      FROM public.skill_workspace_items
      WHERE owner_id = ${user.id}
      ORDER BY created_at DESC, id DESC`;
    return json({ items });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "이 페이지에서 다시 시도해 주세요." }, 403);
  }

  try {
    const user = await sessionUser();
    if (!user) return json({ error: "이메일 인증 후 로그인해 주세요." }, 401);
    const contentType = request.headers.get("content-type") ?? "";
    const upload = contentType.startsWith("multipart/form-data;");
    if (!upload && !contentType.startsWith("application/json")) {
      return json({ error: "저장 형식을 확인해 주세요." }, 415);
    }
    let input;
    try {
      input = upload ? Object.fromEntries(await request.formData()) : await request.json();
    } catch {
      return json({ error: "저장할 내용을 확인해 주세요." }, 400);
    }

    const title = clean(input?.title);
    const description = clean(input?.description);
    const skill = clean(input?.skill);
    const prompt = clean(input?.prompt);
    if (!title || title.length > 80 || description.length > 240 || skill.length > 90) {
      return json({ error: "제목과 설명의 길이를 확인해 주세요." }, 400);
    }
    const sql = neon(process.env.DATABASE_URL);
    if (upload) {
      const asset = input.asset;
      if (!(asset instanceof File) || !allowedFiles.has(asset.type) || !asset.size || asset.size > 4_000_000 || asset.name.length > 160) {
        return json({ error: "4MB 이하의 PNG, JPEG, WebP, MP4, PDF 파일을 선택해 주세요." }, 400);
      }
      const bytes = Buffer.from(await asset.arrayBuffer()).toString("base64");
      const [saved] = await sql`
        INSERT INTO public.skill_workspace_items (owner_id, kind, title, description, skill, asset, asset_type, asset_name)
        VALUES (${user.id}, 'draft', ${title}, ${description}, ${skill}, decode(${bytes}, 'base64'), ${asset.type}, ${asset.name})
        RETURNING id`;
      return json(saved, 201);
    }
    if (!prompt || prompt.length > 6000) return json({ error: "프롬프트는 1~6,000자로 입력해 주세요." }, 400);
    const [saved] = await sql`
      INSERT INTO public.skill_workspace_items (owner_id, kind, title, description, skill, prompt_text)
      VALUES (${user.id}, 'prompt', ${title}, ${description}, ${skill}, ${prompt})
      RETURNING id`;
    return json(saved, 201);
  } catch (error) {
    return databaseError(error);
  }
}
