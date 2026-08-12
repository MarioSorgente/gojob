import { describe, expect, it } from "vitest";
import {
  isOwnedStorageReference,
  storageObjectPath,
} from "./storagePaths";

const UID = "abc123";
const OTHER = "victim456";
const BUCKET = "gojob-demo.appspot.com";

const downloadUrl = (path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=9f8e7d6c`;

describe("storageObjectPath", () => {
  it("passes through a raw bucket-relative path", () => {
    expect(storageObjectPath("users/abc123/public/photo-1.jpg")).toBe(
      "users/abc123/public/photo-1.jpg",
    );
  });

  it("decodes a Firebase download URL", () => {
    expect(storageObjectPath(downloadUrl("users/abc123/public/photo-1.jpg"))).toBe(
      "users/abc123/public/photo-1.jpg",
    );
  });

  it("handles the storage emulator host", () => {
    const url = `http://localhost:9199/v0/b/${BUCKET}/o/${encodeURIComponent("users/abc123/private/id-1.jpg")}?alt=media`;
    expect(storageObjectPath(url)).toBe("users/abc123/private/id-1.jpg");
  });

  it("handles direct GCS URLs", () => {
    expect(
      storageObjectPath(`https://storage.googleapis.com/${BUCKET}/users/abc123/public/x.jpg`),
    ).toBe("users/abc123/public/x.jpg");
  });

  it("rejects unrelated hosts", () => {
    expect(storageObjectPath("https://evil.example.com/users/abc123/public/x.jpg")).toBeNull();
    // A host that merely contains the trusted name must not pass.
    expect(
      storageObjectPath("https://firebasestorage.googleapis.com.evil.com/v0/b/b/o/users%2Fabc123%2Fpublic%2Fx.jpg"),
    ).toBeNull();
  });

  it("rejects traversal and malformed input", () => {
    expect(storageObjectPath("users/abc123/public/../../victim456/private/id.jpg")).toBeNull();
    expect(storageObjectPath("/users//abc123/public/x.jpg")).toBeNull();
    expect(storageObjectPath("")).toBeNull();
    expect(storageObjectPath("   ")).toBeNull();
    // Truncated percent-escape: decodeURIComponent throws, so we must not
    // fall back to trusting the raw bytes.
    expect(
      storageObjectPath(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/users%2Fabc%`),
    ).toBeNull();
  });

  it("is a parser, not the security boundary", () => {
    // Arbitrary junk parses as a relative path; that's fine, because every
    // caller goes through isOwnedStorageReference, which requires the
    // users/{uid}/{scope}/ prefix. Asserted explicitly so the split in
    // responsibility doesn't get "tidied up" into a false sense of safety.
    expect(storageObjectPath("not-a-url")).toBe("not-a-url");
    expect(isOwnedStorageReference("not-a-url", UID, "public")).toBe(false);
  });
});

describe("isOwnedStorageReference", () => {
  it("accepts the user's own object in the right scope", () => {
    expect(isOwnedStorageReference(downloadUrl(`users/${UID}/public/photo.jpg`), UID, "public")).toBe(true);
    expect(isOwnedStorageReference(`users/${UID}/private/id.jpg`, UID, "private")).toBe(true);
  });

  it("rejects another user's object — the actual vulnerability", () => {
    expect(
      isOwnedStorageReference(downloadUrl(`users/${OTHER}/private/id.jpg`), UID, "private"),
    ).toBe(false);
    expect(isOwnedStorageReference(`users/${OTHER}/public/photo.jpg`, UID, "public")).toBe(false);
  });

  it("rejects the wrong scope", () => {
    // A private ID document must never be persisted as a public photo URL.
    expect(isOwnedStorageReference(`users/${UID}/private/id.jpg`, UID, "public")).toBe(false);
    expect(isOwnedStorageReference(`users/${UID}/public/photo.jpg`, UID, "private")).toBe(false);
  });

  it("rejects a uid that is only a prefix of another", () => {
    // "abc123" must not match "users/abc1234/…".
    expect(isOwnedStorageReference(`users/${UID}4/public/photo.jpg`, UID, "public")).toBe(false);
  });

  it("rejects an off-site URL and junk", () => {
    expect(isOwnedStorageReference("https://evil.example.com/x.jpg", UID, "public")).toBe(false);
    expect(isOwnedStorageReference("javascript:alert(1)", UID, "public")).toBe(false);
    expect(isOwnedStorageReference("", UID, "public")).toBe(false);
  });

  it("rejects a uid containing a separator", () => {
    expect(isOwnedStorageReference("users/a/public/x.jpg", "a/public/x.jpg", "public")).toBe(false);
  });
});
